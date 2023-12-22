defmodule Felix.Application do
  # See https://hexdocs.pm/elixir/Application.html
  # for more information on OTP Applications
  @moduledoc false

  use Application

  @impl true
  def start(_type, _args) do
    children = [
      Felix.Repo,
      {DNSCluster, query: Application.get_env(:felix, :dns_cluster_query) || :ignore},
      {DynamicSupervisor, name: Felix.GameSupervisor, strategy: :one_for_one},
      {Registry, keys: :unique, name: Felix.GameRegistry},
      {Phoenix.PubSub, name: Felix.PubSub}
      # Start a worker by calling: Felix.Worker.start_link(arg)
      # {Felix.Worker, arg}
    ]

    Supervisor.start_link(children, strategy: :one_for_one, name: Felix.Supervisor)
  end
end
